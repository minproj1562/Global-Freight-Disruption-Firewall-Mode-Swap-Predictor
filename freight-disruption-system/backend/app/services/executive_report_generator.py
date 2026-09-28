# backend/app/services/executive_report_generator.py
"""
Executive Report PDF Generator
Creates multi-page executive summary reports with charts
"""

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.platypus.flowables import HRFlowable
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from datetime import datetime
from typing import Dict, List
import matplotlib.pyplot as plt
import seaborn as sns
import io
import os
from pathlib import Path


class ExecutiveReportGenerator:
    """Generate professional executive summary PDF reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        sns.set_style("whitegrid")
        plt.rcParams['figure.facecolor'] = 'white'
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        
        self.styles.add(ParagraphStyle(
            name='ExecutiveTitle',
            parent=self.styles['Heading1'],
            fontSize=26,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=1,  # Center
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c5282'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='KPIValue',
            parent=self.styles['Normal'],
            fontSize=24,
            textColor=colors.HexColor('#059669'),
            alignment=1,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='KPILabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            alignment=1
        ))
    
    def generate_report(
        self,
        report_type: str,
        kpis: Dict,
        savings_trend: List[Dict],
        disruption_breakdown: List[Dict],
        roi_data: Dict,
        output_path: str = None
    ) -> str:
        """
        Generate executive summary PDF report
        
        Args:
            report_type: daily, weekly, or monthly
            kpis: KPI summary data
            savings_trend: Monthly savings trend data
            disruption_breakdown: Disruption type breakdown
            roi_data: ROI dashboard data
            output_path: Output file path
        
        Returns:
            str: Path to generated PDF
        """
        
        if output_path is None:
            os.makedirs('/tmp/executive_reports', exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = f'/tmp/executive_reports/executive_report_{report_type}_{timestamp}.pdf'
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1*inch,
            bottomMargin=0.75*inch
        )
        
        story = []
        
        # Page 1: Cover & KPIs
        story.extend(self._build_cover_page(report_type, kpis))
        story.append(PageBreak())
        
        # Page 2: ROI Dashboard
        story.extend(self._build_roi_page(roi_data))
        story.append(PageBreak())
        
        # Page 3: Savings Trend & Disruption Breakdown
        story.extend(self._build_analytics_page(savings_trend, disruption_breakdown))
        story.append(PageBreak())
        
        # Page 4: Footer & Recommendations
        story.extend(self._build_summary_page(kpis, roi_data))
        
        # Build PDF
        doc.build(story)
        
        print(f"[Executive Report] PDF generated: {output_path}")
        return output_path
    
    def _build_cover_page(self, report_type: str, kpis: Dict) -> List:
        """Build cover page with title and KPI summary"""
        
        elements = []
        
        # Title
        title = Paragraph(
            f"{report_type.upper()} EXECUTIVE SUMMARY",
            self.styles['ExecutiveTitle']
        )
        elements.append(title)
        
        # Report metadata
        metadata = f"""
        <b>Report Period:</b> {report_type.capitalize()}<br/>
        <b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}<br/>
        <b>System:</b> FreightFirewall AI Reroute Optimization Platform
        """
        elements.append(Paragraph(metadata, self.styles['Normal']))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2c5282')))
        elements.append(Spacer(1, 0.3*inch))
        
        # KPI Cards
        elements.append(Paragraph("Key Performance Indicators", self.styles['SectionHeader']))
        
        kpi_data = [
            ['Metric', 'Value', 'Status'],
            [
                'Cost Saved This Month',
                f"${kpis.get('cost_saved_this_month_usd', 0):,.2f}",
                '✓ Active'
            ],
            [
                'Routes Rerouted',
                str(kpis.get('routes_rerouted_count', 0)),
                '✓ Active'
            ],
            [
                'Avg Decision Time',
                f"{kpis.get('avg_decision_time_minutes', 0):.1f} min",
                '✓ Optimal'
            ],
            [
                'Active Disruptions',
                str(kpis.get('active_disruptions_count', 0)),
                '⚠ Monitor'
            ],
            [
                'Vessels at Risk',
                str(kpis.get('vessels_at_risk_count', 0)),
                '⚠ Monitor'
            ]
        ]
        
        kpi_table = Table(kpi_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ]))
        
        elements.append(kpi_table)
        
        return elements
    
    def _build_roi_page(self, roi_data: Dict) -> List:
        """Build ROI dashboard page"""
        
        elements = []
        
        elements.append(Paragraph("Return on Investment Dashboard", self.styles['ExecutiveTitle']))
        elements.append(Spacer(1, 0.2*inch))
        
        # ROI Summary message
        summary_box = Paragraph(
            f'<para align="center" fontSize="14" textColor="#059669"><b>{roi_data.get("summary_message", "")}</b></para>',
            self.styles['Normal']
        )
        elements.append(summary_box)
        elements.append(Spacer(1, 0.3*inch))
        
        # ROI Metrics Table
        roi_table_data = [
            ['Period', 'Cost Saved (USD)', 'Cost Saved (₹ Cr)', 'Time Saved (Days)', 'Routes Optimized'],
            [
                'This Month',
                f"${roi_data.get('month_cost_saved_usd', 0):,.2f}",
                f"₹{roi_data.get('month_cost_saved_crores', 0):.2f} Cr",
                f"{roi_data.get('month_time_saved_days', 0):.1f}",
                '-'
            ],
            [
                'Year to Date',
                f"${roi_data.get('ytd_cost_saved_usd', 0):,.2f}",
                f"₹{roi_data.get('ytd_cost_saved_crores', 0):.2f} Cr",
                f"{roi_data.get('ytd_time_saved_days', 0):.1f}",
                str(roi_data.get('ytd_routes_optimized', 0))
            ]
        ]
        
        roi_table = Table(roi_table_data, colWidths=[1.5*inch, 1.8*inch, 1.5*inch, 1.3*inch, 1.3*inch])
        roi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')]),
        ]))
        
        elements.append(roi_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Additional Metrics
        additional_data = [
            ['Metric', 'Value'],
            ['Carbon Reduced (YTD)', f"{roi_data.get('ytd_carbon_reduced_tons', 0):.1f} tonnes CO₂"],
            ['System Effectiveness', f"{roi_data.get('system_effectiveness_percent', 0):.1f}% of disruptions mitigated"],
        ]
        
        additional_table = Table(additional_data, colWidths=[3*inch, 3*inch])
        additional_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4b5563')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(additional_table)
        
        return elements
    
    def _build_analytics_page(self, savings_trend: List[Dict], disruption_breakdown: List[Dict]) -> List:
        """Build analytics page with charts"""
        
        elements = []
        
        elements.append(Paragraph("Analytics & Insights", self.styles['ExecutiveTitle']))
        elements.append(Spacer(1, 0.2*inch))
        
        # Generate savings trend chart
        savings_chart_path = self._generate_savings_trend_chart(savings_trend)
        if os.path.exists(savings_chart_path):
            savings_img = Image(savings_chart_path, width=6*inch, height=3*inch)
            elements.append(Paragraph("Monthly Savings Trend", self.styles['SectionHeader']))
            elements.append(savings_img)
            elements.append(Spacer(1, 0.2*inch))
        
        # Generate disruption breakdown pie chart
        disruption_chart_path = self._generate_disruption_pie_chart(disruption_breakdown)
        if os.path.exists(disruption_chart_path):
            disruption_img = Image(disruption_chart_path, width=5*inch, height=3*inch)
            elements.append(Paragraph("Disruption Type Breakdown", self.styles['SectionHeader']))
            elements.append(disruption_img)
        
        return elements
    
    def _generate_savings_trend_chart(self, trend_data: List[Dict]) -> str:
        """Generate monthly savings trend bar chart"""
        
        if not trend_data:
            return ""
        
        months = [item['month'] for item in trend_data]
        savings = [item['cost_saved_usd'] / 1000000 for item in trend_data]  # Convert to millions
        
        fig, ax = plt.subplots(figsize=(10, 5))
        
        bars = ax.bar(months, savings, color='#059669', alpha=0.8, edgecolor='#047857', linewidth=1.5)
        
        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'${height:.2f}M',
                   ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        ax.set_xlabel('Month', fontsize=12, fontweight='bold')
        ax.set_ylabel('Cost Saved (Million USD)', fontsize=12, fontweight='bold')
        ax.set_title('Monthly Cost Savings Trend', fontsize=14, fontweight='bold', pad=20)
        ax.grid(axis='y', alpha=0.3)
        
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        chart_path = '/tmp/executive_reports/savings_trend.png'
        plt.savefig(chart_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        
        return chart_path
    
    def _generate_disruption_pie_chart(self, breakdown_data: List[Dict]) -> str:
        """Generate disruption type breakdown pie chart"""
        
        if not breakdown_data:
            return ""
        
        labels = [item['disruption_type'][:30] for item in breakdown_data]  # Truncate long labels
        sizes = [item['count'] for item in breakdown_data]
        
        fig, ax = plt.subplots(figsize=(8, 6))
        
        colors_palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']
        
        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            autopct='%1.1f%%',
            startangle=90,
            colors=colors_palette[:len(sizes)],
            textprops={'fontsize': 10, 'fontweight': 'bold'}
        )
        
        # Make percentage text white and bold
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(11)
        
        ax.set_title('Disruption Types Mitigated', fontsize=14, fontweight='bold', pad=20)
        
        plt.tight_layout()
        
        chart_path = '/tmp/executive_reports/disruption_breakdown.png'
        plt.savefig(chart_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        
        return chart_path
    
    def _build_summary_page(self, kpis: Dict, roi_data: Dict) -> List:
        """Build summary and recommendations page"""
        
        elements = []
        
        elements.append(Paragraph("Executive Summary & Recommendations", self.styles['ExecutiveTitle']))
        elements.append(Spacer(1, 0.2*inch))
        
        # Key Achievements
        achievements = f"""
        <b>Key Achievements:</b><br/><br/>
        
        ✓ <b>${kpis.get('cost_saved_this_month_usd', 0):,.2f}</b> saved this month through intelligent rerouting<br/>
        ✓ <b>{kpis.get('routes_rerouted_count', 0)}</b> routes successfully optimized<br/>
        ✓ Average decision time of <b>{kpis.get('avg_decision_time_minutes', 0):.1f} minutes</b> - {self._get_decision_time_verdict(kpis.get('avg_decision_time_minutes', 0))}<br/>
        ✓ <b>{roi_data.get('ytd_carbon_reduced_tons', 0):.1f} tonnes</b> of CO₂ emissions avoided YTD<br/>
        ✓ System effectiveness: <b>{roi_data.get('system_effectiveness_percent', 0):.1f}%</b> of disruptions successfully mitigated<br/><br/>
        
        <b>Current Risk Landscape:</b><br/><br/>
        
        ⚠ <b>{kpis.get('active_disruptions_count', 0)}</b> active disruptions currently being monitored<br/>
        ⚠ <b>{kpis.get('vessels_at_risk_count', 0)}</b> vessels identified as at-risk and requiring attention<br/><br/>
        
        <b>Strategic Recommendations:</b><br/><br/>
        
        1. <b>Continue Proactive Monitoring:</b> Maintain 24/7 surveillance of {kpis.get('active_disruptions_count', 0)} active threat zones<br/>
        2. <b>Optimize Decision Speed:</b> Target sub-5-minute average decision time through enhanced automation<br/>
        3. <b>Expand Coverage:</b> Onboard additional vessels to AI-powered reroute recommendation system<br/>
        4. <b>Leverage Savings:</b> Reinvest ${kpis.get('cost_saved_this_month_usd', 0)/10:,.2f} monthly into route optimization R&D<br/>
        5. <b>Carbon Credits:</b> Explore monetization of {roi_data.get('ytd_carbon_reduced_tons', 0):.1f} tonnes CO₂ reduction<br/>
        """
        
        elements.append(Paragraph(achievements, self.styles['Normal']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Footer
        footer = f"""
        <para align="center" fontSize="9" textColor="#6b7280">
        <i>This executive report was generated by FreightFirewall AI Platform on {datetime.now().strftime('%Y-%m-%d at %H:%M UTC')}.<br/>
        Confidential & Proprietary | For Executive Leadership Only</i>
        </para>
        """
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        elements.append(Paragraph(footer, self.styles['Normal']))
        
        return elements
    
    def _get_decision_time_verdict(self, avg_time: float) -> str:
        """Get verdict on decision time performance"""
        if avg_time < 5:
            return "Excellent"
        elif avg_time < 10:
            return "Good"
        elif avg_time < 20:
            return "Acceptable"
        else:
            return "Needs Improvement"