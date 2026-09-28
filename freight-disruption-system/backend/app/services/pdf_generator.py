# backend/app/services/pdf_generator.py
"""
PDF Report Generator for Reroute Confirmation
Uses ReportLab to generate professional shipping dispatch orders
"""
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.platypus.flowables import HRFlowable
from datetime import datetime
from typing import Dict, List
import os
import io


class ReroutePDFGenerator:
    """Generate professional reroute dispatch order PDFs"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=1  # Center
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2c5282'),
            spaceAfter=12,
            spaceBefore=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='InfoText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#2d3748')
        ))
    
    def generate_reroute_order(
        self,
        decision_data: Dict,
        output_path: str = None
    ) -> str:
        """
        Generate reroute dispatch order PDF
        
        Args:
            decision_data: Dict containing all reroute decision details
            output_path: Path to save PDF (if None, generates in /tmp)
        
        Returns:
            Path to generated PDF file
        """
        if output_path is None:
            os.makedirs('/tmp/reroute_pdfs', exist_ok=True)
            output_path = f'/tmp/reroute_pdfs/reroute_order_{decision_data["decision_id"]}.pdf'
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1*inch,
            bottomMargin=0.75*inch
        )
        
        # Build content
        story = []
        
        # Header
        story.extend(self._build_header(decision_data))
        story.append(Spacer(1, 0.3*inch))
        
        # Executive Summary
        story.extend(self._build_executive_summary(decision_data))
        story.append(Spacer(1, 0.2*inch))
        
        # Route Details
        story.extend(self._build_route_details(decision_data))
        story.append(Spacer(1, 0.2*inch))
        
        # Cost Breakdown
        story.extend(self._build_cost_breakdown(decision_data))
        story.append(Spacer(1, 0.2*inch))
        
        # Waypoints & Transit Instructions
        story.extend(self._build_waypoints(decision_data))
        story.append(Spacer(1, 0.2*inch))
        
        # Savings Analysis
        story.extend(self._build_savings_analysis(decision_data))
        story.append(Spacer(1, 0.2*inch))
        
        # Footer
        story.extend(self._build_footer(decision_data))
        
        # Build PDF
        doc.build(story)
        
        return output_path
    
    def _build_header(self, data: Dict) -> List:
        """Build PDF header section"""
        elements = []
        
        # Title
        title = Paragraph(
            "REROUTE DISPATCH ORDER",
            self.styles['CustomTitle']
        )
        elements.append(title)
        
        # Order ID and timestamp
        order_info = f"""
        <b>Order ID:</b> {data['decision_id']}<br/>
        <b>Issued:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}<br/>
        <b>Status:</b> <font color="green">CONFIRMED</font>
        """
        elements.append(Paragraph(order_info, self.styles['InfoText']))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2c5282')))
        
        return elements
    
    def _build_executive_summary(self, data: Dict) -> List:
        """Build executive summary section"""
        elements = []
        
        elements.append(Paragraph("Executive Summary", self.styles['SectionHeader']))
        
        summary_data = [
            ['Vessel', data.get('vessel_name', 'N/A')],
            ['Origin', f"{data.get('origin_name', 'N/A')} ({data.get('origin_code', '')})"],
            ['Destination', f"{data.get('destination_name', 'N/A')} ({data.get('dest_code', '')})"],
            ['Cargo Type', data.get('cargo_type', 'N/A')],
            ['Cargo Value', f"${data.get('cargo_value_usd', 0):,.2f} USD"],
            ['Disruption Avoided', data.get('disruption_name', 'N/A')],
            ['Selected Route', data.get('selected_route_name', 'N/A')],
            ['Optimization Priority', data.get('priority', 'Balanced')],
        ]
        
        table = Table(summary_data, colWidths=[2*inch, 4.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_route_details(self, data: Dict) -> List:
        """Build route details section"""
        elements = []
        
        elements.append(Paragraph("Route Performance Metrics", self.styles['SectionHeader']))
        
        metrics_data = [
            ['Metric', 'Value', 'vs Original Route'],
            ['Total Cost', f"${data.get('selected_cost_usd', 0):,.2f}", f"${data.get('cost_saved_usd', 0):,.2f} saved"],
            ['Transit Time', f"{data.get('selected_time_days', 0):.1f} days", f"{data.get('time_saved_days', 0):.1f} days saved"],
            ['Carbon Footprint', f"{data.get('selected_co2_tons', 0):.1f} tons", f"{data.get('carbon_reduced_tons', 0):.1f} tons reduced"],
            ['Risk Level', data.get('selected_risk_level', 'low').upper(), 'Optimized'],
            ['Confidence Score', f"{data.get('selected_confidence_score', 0):.1f}%", 'High Confidence'],
        ]
        
        table = Table(metrics_data, colWidths=[2*inch, 2*inch, 2.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        # Mode breakdown
        mode_breakdown = data.get('mode_breakdown', {})
        if mode_breakdown:
            elements.append(Spacer(1, 0.15*inch))
            elements.append(Paragraph("Multimodal Transport Breakdown", self.styles['Normal']))
            
            mode_data = [['Transport Mode', 'Percentage']]
            for mode, pct in mode_breakdown.items():
                if pct > 0:
                    mode_data.append([mode.capitalize(), f"{pct:.1f}%"])
            
            mode_table = Table(mode_data, colWidths=[2*inch, 2*inch])
            mode_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(mode_table)
        
        return elements
    
    def _build_cost_breakdown(self, data: Dict) -> List:
        """Build detailed cost breakdown section"""
        elements = []
        
        elements.append(Paragraph("Detailed Cost Breakdown", self.styles['SectionHeader']))
        
        breakdown = data.get('cost_breakdown', {})
        
        cost_data = [['Cost Component', 'Amount (USD)']]
        
        # Add all non-zero cost components
        for key, value in breakdown.items():
            if value > 0 and key not in ['subtotal', 'total_cost_usd', 'total_cost_inr', 'exchange_rate_usd_inr']:
                label = key.replace('_', ' ').title()
                cost_data.append([label, f"${value:,.2f}"])
        
        # Add totals
        cost_data.append(['Subtotal', f"${breakdown.get('subtotal', 0):,.2f}"])
        cost_data.append(['Taxes & Surcharges', f"${breakdown.get('taxes_surcharges', 0):,.2f}"])
        cost_data.append(['TOTAL (USD)', f"${breakdown.get('total_cost_usd', 0):,.2f}"])
        cost_data.append(['TOTAL (INR)', f"₹{breakdown.get('total_cost_inr', 0):,.2f}"])
        
        table = Table(cost_data, colWidths=[3.5*inch, 2.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -4), (-1, -1), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, -4), (-1, -1), 'Helvetica-Bold'),
            ('LINEABOVE', (0, -4), (-1, -4), 2, colors.black),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_waypoints(self, data: Dict) -> List:
        """Build waypoints and transit instructions"""
        elements = []
        
        elements.append(Paragraph("Route Waypoints & Transit Instructions", self.styles['SectionHeader']))
        
        waypoint_names = data.get('waypoint_names', [])
        carrier = data.get('carrier_name', 'TBD')
        
        waypoint_data = [['Leg', 'Waypoint', 'Instructions']]
        
        for i, wp_name in enumerate(waypoint_names):
            if i == 0:
                instruction = f"Depart from {wp_name} - Load cargo"
            elif i == len(waypoint_names) - 1:
                instruction = f"Arrive at {wp_name} - Discharge cargo"
            else:
                instruction = f"Transit via {wp_name} - Coordinate with {carrier}"
            
            waypoint_data.append([f"Leg {i+1}", wp_name, instruction])
        
        table = Table(waypoint_data, colWidths=[0.8*inch, 2.5*inch, 3.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(table)
        
        # Carrier information
        carrier_info = f"""
        <b>Primary Carrier:</b> {carrier}<br/>
        <b>Transit Summary:</b> {data.get('transit_summary', 'N/A')}<br/>
        <b>Corridor:</b> {data.get('corridor_name', 'N/A')}
        """
        elements.append(Spacer(1, 0.1*inch))
        elements.append(Paragraph(carrier_info, self.styles['InfoText']))
        
        return elements
    
    def _build_savings_analysis(self, data: Dict) -> List:
        """Build savings analysis section"""
        elements = []
        
        elements.append(Paragraph("Savings vs Original Route", self.styles['SectionHeader']))
        
        savings_text = f"""
        By selecting this optimized reroute, the following savings are achieved compared to 
        the traditional shortest-path route through disrupted zones:<br/><br/>
        
        <b>Cost Savings:</b> ${data.get('cost_saved_usd', 0):,.2f} USD ({((data.get('cost_saved_usd', 0) / max(data.get('original_cost_usd', 1), 1)) * 100):.1f}% reduction)<br/>
        <b>Time Savings:</b> {data.get('time_saved_days', 0):.1f} days earlier arrival<br/>
        <b>Carbon Reduction:</b> {data.get('carbon_reduced_tons', 0):.1f} tons CO₂ avoided<br/>
        <b>Risk Mitigation:</b> Avoiding {data.get('disruption_name', 'critical disruption zone')}<br/><br/>
        
        <b>Rationale:</b> {data.get('rationale', 'AI-recommended optimal reroute based on multi-objective optimization.')}
        """
        
        elements.append(Paragraph(savings_text, self.styles['InfoText']))
        
        return elements
    
    def _build_footer(self, data: Dict) -> List:
        """Build PDF footer"""
        elements = []
        
        elements.append(Spacer(1, 0.3*inch))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        
        footer_text = f"""
        <i>This reroute dispatch order was generated by FreightFirewall AI Reroute Recommender System.<br/>
        Decision ID: {data['decision_id']} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}<br/>
        Authorized by: {data.get('user_name', 'System Administrator')} | Organization: {data.get('organization', 'Global Logistics')}</i>
        """
        
        elements.append(Paragraph(footer_text, self.styles['InfoText']))
        
        return elements